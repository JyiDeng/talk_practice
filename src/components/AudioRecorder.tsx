import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number; // 最大录音时长（秒）
}

export function AudioRecorder({ onRecordingComplete, maxDuration = 180 }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 使用webm格式录音
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        // 转换为WAV格式
        const wavBlob = await convertToWav(audioBlob);
        onRecordingComplete(wavBlob, duration);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;

      // 开始计时
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          stopRecording();
          toast.info(`已达到最大录音时长 ${maxDuration} 秒`);
        }
      }, 100);
    } catch (error) {
      console.error('录音启动失败:', error);
      toast.error('无法访问麦克风，请检查权限设置');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      pausedTimeRef.current += Date.now() - startTimeRef.current;
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          stopRecording();
          toast.info(`已达到最大录音时长 ${maxDuration} 秒`);
        }
      }, 100);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resetRecording = () => {
    setDuration(0);
    setAudioURL(null);
    chunksRef.current = [];
  };

  // 转换音频为WAV格式
  const convertToWav = async (webmBlob: Blob): Promise<Blob> => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 转换为16位PCM WAV
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  // 将AudioBuffer转换为WAV格式
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // 写入WAV文件头
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF标识符
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // 文件长度
    setUint32(0x45564157); // "WAVE"

    // fmt子块
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // 子块大小
    setUint16(1); // 音频格式（PCM）
    setUint16(buffer.numberOfChannels); // 声道数
    setUint32(buffer.sampleRate); // 采样率
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // 字节率
    setUint16(buffer.numberOfChannels * 2); // 块对齐
    setUint16(16); // 位深度

    // data子块
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4); // 数据长度

    // 写入PCM数据
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (duration / maxDuration) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        {!isRecording && !audioURL && (
          <Button onClick={startRecording} size="lg" className="gap-2">
            <Mic className="h-5 w-5" />
            开始录音
          </Button>
        )}

        {isRecording && (
          <>
            {!isPaused ? (
              <Button onClick={pauseRecording} variant="secondary" size="lg" className="gap-2">
                <Pause className="h-5 w-5" />
                暂停
              </Button>
            ) : (
              <Button onClick={resumeRecording} size="lg" className="gap-2">
                <Play className="h-5 w-5" />
                继续
              </Button>
            )}
            <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
              <Square className="h-5 w-5" />
              停止
            </Button>
          </>
        )}

        {audioURL && !isRecording && (
          <Button onClick={resetRecording} variant="outline" size="lg">
            重新录音
          </Button>
        )}
      </div>

      {(isRecording || audioURL) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">录音时长</span>
            <span className="font-mono font-semibold">{formatTime(duration)}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            最长 {formatTime(maxDuration)}
          </p>
        </div>
      )}

      {audioURL && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <audio src={audioURL} controls className="w-full" />
        </div>
      )}
    </div>
  );
}
