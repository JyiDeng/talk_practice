-- 修改practice_tasks表，添加difficulty_type字段
ALTER TABLE public.practice_tasks ADD COLUMN IF NOT EXISTS difficulty_type text DEFAULT 'level1';

-- 更新现有数据
UPDATE public.practice_tasks SET difficulty_type = 'level1' WHERE difficulty_level <= 2;
UPDATE public.practice_tasks SET difficulty_type = 'level2' WHERE difficulty_level = 3;
UPDATE public.practice_tasks SET difficulty_type = 'level3' WHERE difficulty_level >= 4;

-- 删除旧的练习任务
DELETE FROM public.practice_tasks;

-- 插入新的学术科研练习任务示例
INSERT INTO public.practice_tasks (title, description, difficulty_level, difficulty_type, key_points, reference_answer, language, category) VALUES
-- Level 1 示例
(
  '解释Transformer注意力机制',
  '你的同事对Transformer的自注意力机制不太理解，请用简单的语言解释这个概念。',
  1,
  'level1',
  '[
    {"point": "注意力机制的基本概念", "weight": 0.3},
    {"point": "Query、Key、Value的作用", "weight": 0.3},
    {"point": "自注意力的计算过程", "weight": 0.4}
  ]'::jsonb,
  '自注意力机制允许模型在处理序列时，动态地关注输入序列中的不同位置。它通过Query、Key、Value三个矩阵来计算注意力权重，使得每个位置都能获取到与其他位置的关联信息，从而更好地捕捉长距离依赖关系。',
  '中文',
  '技术解释'
),
(
  '对比CNN和ViT的特征提取方式',
  '在一次技术讨论中，需要你解释CNN和Vision Transformer在图像特征提取上的主要区别。',
  1,
  'level1',
  '[
    {"point": "CNN的局部感受野特性", "weight": 0.3},
    {"point": "ViT的全局建模能力", "weight": 0.3},
    {"point": "归纳偏置的差异", "weight": 0.4}
  ]'::jsonb,
  'CNN通过卷积核提取局部特征，具有平移不变性和局部连接的归纳偏置。而ViT将图像分割成patches后使用自注意力机制，能够在早期层就建立全局依赖关系，但需要更多数据来学习这些模式。两者在小数据集和大数据集上的表现各有优劣。',
  '中文',
  '技术解释'
),
(
  '解释为什么需要Batch Normalization',
  '团队新成员问你为什么要在神经网络中使用Batch Normalization，请解释其作用和原理。',
  2,
  'level1',
  '[
    {"point": "内部协变量偏移问题", "weight": 0.3},
    {"point": "加速训练收敛", "weight": 0.3},
    {"point": "正则化效果", "weight": 0.4}
  ]'::jsonb,
  'Batch Normalization主要解决内部协变量偏移问题，即网络层输入分布在训练过程中不断变化。通过对每个batch的数据进行标准化，可以稳定训练过程，加快收敛速度，同时还具有一定的正则化效果，减少对Dropout的依赖。',
  '中文',
  '工程讨论'
),

-- Level 2 示例
(
  '组会讨论：对比学习的负样本选择策略',
  '在研究组会上，导师问你在对比学习中如何选择有效的负样本，以及不同策略对模型性能的影响。',
  3,
  'level2',
  '[
    {"point": "Hard negative mining的重要性", "weight": 0.3},
    {"point": "负样本数量与质量的权衡", "weight": 0.3},
    {"point": "不同采样策略的实验对比", "weight": 0.4}
  ]'::jsonb,
  '负样本选择是对比学习的关键。Hard negative mining可以选择与正样本相似但不同类的样本，提高模型的判别能力。但过多的hard negatives可能导致训练不稳定。我们需要在负样本的数量和质量之间找到平衡，可以通过实验对比随机采样、hard mining和curriculum learning等策略的效果。',
  '中文',
  '研究讨论'
),
(
  '论文Brainstorming：多模态表征学习的新方向',
  '导师希望探索多模态表征学习的新研究方向，让你提出一个有潜力的研究问题和初步思路。',
  3,
  'level2',
  '[
    {"point": "当前研究的局限性", "weight": 0.3},
    {"point": "提出的新问题", "weight": 0.3},
    {"point": "可能的解决方案", "weight": 0.4}
  ]'::jsonb,
  '当前多模态表征学习主要关注图文对齐，但在处理细粒度语义和长尾分布时存在局限。我们可以研究如何利用知识图谱增强多模态表征的语义理解能力。具体思路是将实体关系信息融入到对比学习框架中，使模型不仅学习模态间的对应关系，还能理解概念间的层次结构。',
  '中文',
  '研究讨论'
),
(
  '实验失败分析：为什么模型在小样本场景下性能下降',
  '你的few-shot学习实验在小样本场景下表现不佳，导师要求你分析可能的原因并提出改进方案。',
  3,
  'level2',
  '[
    {"point": "过拟合问题分析", "weight": 0.3},
    {"point": "数据增强策略", "weight": 0.3},
    {"point": "模型架构调整", "weight": 0.4}
  ]'::jsonb,
  '小样本场景下性能下降主要是过拟合导致的。可以从三个方面改进：一是使用更强的数据增强策略，如MixUp和CutMix；二是采用元学习方法，在训练时模拟few-shot场景；三是使用预训练模型并进行适当的正则化，如添加dropout或使用更小的学习率进行微调。',
  '中文',
  '研究讨论'
),

-- Level 3 示例
(
  '技术面试：设计一个可扩展的特征提取系统',
  '面试官要求你设计一个支持多种模型的特征提取系统，需要考虑性能、可扩展性和易用性。请说明你的设计思路。',
  5,
  'level3',
  '[
    {"point": "系统架构设计", "weight": 0.3},
    {"point": "性能优化策略", "weight": 0.3},
    {"point": "接口设计和扩展性", "weight": 0.4}
  ]'::jsonb,
  '我会设计一个插件化的架构，核心是一个模型注册器和统一的特征提取接口。使用工厂模式支持动态加载不同模型，通过批处理和GPU并行提升性能。接口设计上提供同步和异步两种模式，支持流式处理大规模数据。扩展性方面，定义清晰的模型适配器接口，新模型只需实现该接口即可集成。',
  '中文',
  '技术面试'
),
(
  '答辩质疑：你的方法相比SOTA只提升了1%，如何证明其有效性',
  '在论文答辩中，评审专家质疑你的方法提升幅度较小，要求你说明这个提升是否具有统计显著性和实际意义。',
  5,
  'level3',
  '[
    {"point": "统计显著性检验", "weight": 0.3},
    {"point": "实际应用价值", "weight": 0.3},
    {"point": "方法的通用性", "weight": 0.4}
  ]'::jsonb,
  '首先，我们进行了多次实验并使用t检验验证了提升的统计显著性（p<0.05）。其次，在实际应用场景中，1%的提升在大规模数据上可以带来显著的业务价值。更重要的是，我们的方法具有通用性，可以与其他技术组合使用，在多个数据集上都观察到了一致的提升，这证明了方法的有效性和鲁棒性。',
  '中文',
  '技术答辩'
),
(
  '系统评审：为什么选择这个模型架构而不是更简单的方案',
  '技术评审会上，架构师质疑你的模型设计过于复杂，认为简单方案可能就足够了。请为你的设计决策辩护。',
  5,
  'level3',
  '[
    {"point": "复杂度与性能的权衡", "weight": 0.3},
    {"point": "实验对比数据", "weight": 0.3},
    {"point": "长期维护考虑", "weight": 0.4}
  ]'::jsonb,
  '我们确实对比了简单方案，但在我们的场景下，简单模型无法达到业务要求的准确率阈值。虽然当前方案复杂度较高，但我们通过模块化设计确保了可维护性，并且使用了模型压缩技术控制推理成本。从长期看，这个架构为未来的功能扩展预留了空间，避免了频繁重构的成本。实验数据显示，性能提升带来的收益远超过维护成本。',
  '中文',
  '技术评审'
);