-- 插入初始练习任务数据
INSERT INTO public.practice_tasks (title, description, video_url, difficulty_level, key_points, reference_answer, language, category) VALUES
(
  '产品发布会演讲',
  '观看这段产品发布会视频，用1-2分钟概括产品的核心特点和价值主张',
  'https://www.youtube.com/watch?v=example1',
  1,
  '[
    {"point": "产品名称和定位", "weight": 0.2},
    {"point": "核心功能特性", "weight": 0.3},
    {"point": "目标用户群体", "weight": 0.2},
    {"point": "竞争优势", "weight": 0.3}
  ]'::jsonb,
  '这款产品是一个面向企业用户的协作工具，主要特点包括实时协作、智能任务管理和数据分析功能。它能帮助团队提高30%的工作效率，相比竞品具有更简洁的界面和更强大的集成能力。',
  '中文',
  '产品介绍'
),
(
  '季度业绩汇报',
  '观看这段季度业绩汇报视频，用1-2分钟总结关键业绩指标和未来计划',
  'https://www.youtube.com/watch?v=example2',
  2,
  '[
    {"point": "营收数据", "weight": 0.25},
    {"point": "增长率", "weight": 0.25},
    {"point": "主要成就", "weight": 0.25},
    {"point": "下季度目标", "weight": 0.25}
  ]'::jsonb,
  '本季度营收达到500万元，同比增长45%。主要成就包括新客户增长200家，产品迭代3个版本。下季度目标是实现营收翻倍，并拓展海外市场。',
  '中文',
  '业绩汇报'
),
(
  'Project Status Update',
  'Watch this project status update video and summarize the key progress and challenges in 1-2 minutes',
  'https://www.youtube.com/watch?v=example3',
  2,
  '[
    {"point": "Project milestones achieved", "weight": 0.3},
    {"point": "Current challenges", "weight": 0.3},
    {"point": "Resource requirements", "weight": 0.2},
    {"point": "Next steps", "weight": 0.2}
  ]'::jsonb,
  'We have successfully completed Phase 1 and Phase 2 of the project, delivering the core features on schedule. The main challenge is the integration with legacy systems, which requires additional technical resources. We need two more senior developers to join the team. Next steps include completing the integration by end of month and starting user acceptance testing.',
  '英文',
  'Project Management'
),
(
  '危机公关应对',
  '观看这段危机公关案例，用1-2分钟分析应对策略的优缺点',
  'https://www.youtube.com/watch?v=example4',
  3,
  '[
    {"point": "危机事件描述", "weight": 0.2},
    {"point": "应对措施", "weight": 0.3},
    {"point": "沟通策略", "weight": 0.3},
    {"point": "效果评估", "weight": 0.2}
  ]'::jsonb,
  '该公司面临产品质量问题引发的舆论危机。应对措施包括立即召回问题产品、公开道歉、提供补偿方案。沟通策略采用了透明化原则，第一时间通过多渠道发布信息。整体应对及时有效，但在补偿方案细节上还可以更完善。',
  '中文',
  '危机管理'
),
(
  'Market Analysis Presentation',
  'Watch this market analysis presentation and summarize the key findings and recommendations in 1-2 minutes',
  'https://www.youtube.com/watch?v=example5',
  3,
  '[
    {"point": "Market size and growth", "weight": 0.25},
    {"point": "Competitive landscape", "weight": 0.25},
    {"point": "Customer insights", "weight": 0.25},
    {"point": "Strategic recommendations", "weight": 0.25}
  ]'::jsonb,
  'The market is valued at $10 billion with 15% annual growth. Key competitors include Company A and Company B, with our market share at 8%. Customer research shows strong demand for mobile solutions and AI features. We recommend focusing on product innovation and strategic partnerships to increase market share to 12% within two years.',
  '英文',
  'Market Research'
);