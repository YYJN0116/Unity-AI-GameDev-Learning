# 单局游戏配置模板

本模板记录一局游戏的设定选择、角色/NPC 状态和记账口径。它不替代角色创建规则、NPC 角色库或游戏规则；未确认字段保持待确认，不得由主持者擅自补成事实。

## 1. 本局基本信息

```yaml
session:
  id:
  title:
  rules_version:
  created_at_real: # YYYY-MM-DD；按现实日期记录
  status: setup # setup / active / paused / completed
  save_updated_at_real:
  notes:
```

## 2. 玩家偏好与授权

```yaml
player_preferences:
  story_tone:
  pacing:
  romance: # 偏好、边界或不启用
  combat_detail:
  random_generation: # 哪些字段允许随机生成
  content_boundaries:
  confirmed_by_player:
```

## 3. 世界与开局

```yaml
world:
  setting_source: # 既有设定 / 设定库组合 / 本局生成
  continent_or_world:
  region:
  start_location:
  selected_locations: []
  selected_factions: []
  calendar_name:
  in_game_date:
  local_timekeeping:
  time_unit_reference:
  generated_content_policy: # 仅本局 / 经确认后可并入共享库
  confirmed_by_player:
```

地点、势力、日历或计时尚无依据时填“待确认”。现实日期与游戏内日期分开记录；除非本局规则明确约定，不将现实日期直接当作游戏内日期。

## 4. 玩家角色

```yaml
player_character:
  name:
  age:
  background:
  identity:
  spiritual_root:
  constitution:
  realm:
  cultivation_progress:
  growth_direction:
  advantages: []
  limitations: []
  initial_resources:
  initial_relationships: []
  personal_goal:
  open_story_questions: []
  character_summary_confirmed: false
  save_created: false
```

角色生成依据 `character-creation.md`：以玩家心念/偏好为起点，遵守天命、资源、成长代价与世界规则。未经玩家确认，不将生成草案锁定为正式角色。

## 5. NPC 角色位

```yaml
npcs:
  - slot: protagonist_interest # 女主型
    enabled: false
    preserve_from_previous_session: false
    personality_version:
    generation_status: not_generated
    npc_id:
  - slot: rival # 死对头型
    enabled: false
    preserve_from_previous_session: false
    personality_version:
    generation_status: not_generated
    npc_id:
  - slot: nemesis # 宿敌型
    enabled: false
    preserve_from_previous_session: false
    personality_version:
    generation_status: not_generated
    npc_id:
  - slot: benefactor_mentor # 恩人/导师型
    enabled: false
    preserve_from_previous_session: false
    personality_version:
    generation_status: not_generated
    npc_id:
  - slot: antagonist_or_love_rival # 情敌/反派型
    enabled: false
    preserve_from_previous_session: false
    personality_version:
    generation_status: not_generated
    npc_id:
```

角色位可不启用。NPC 的具体姓名、背景、能力、动机和知识状态按 `npc-generation.md` 生成并写入独立 NPC 记录。

## 6. 资源与判定口径

```yaml
tracking:
  currency_units:
  spirit_stone_conversion: # 仅记录已确认的换算
  cultivation_progress_scale:
  fatigue_scale:
  injury_scale:
  spirit_power_scale:
  time_cost_policy:
  price_sources: []
  uncertain_values_policy: # 标记估计/待校准，不伪装成精确已知
  action_resolution_policy: # 采用 game-design.md 的判定原则
  confirmed_by_player:
```

如果原有文档没有提供量表、阈值、换算率或行动公式，不要在配置模板里硬编码新规则。每局可记录便于核算的临时口径，但须标明来源、是否暂定以及适用范围，并由玩家确认。

## 7. 初始事件与任务

```yaml
events:
  active: []
  latent: []
  completed: []
  deadlines: []
  notes:
```

事件由时间、地点、任务、关系或资源条件触发；本局不要求设置唯一主线。未启用事件不得作为角色已经接下的任务或已知事实。

## 8. 存档、日志与信息隔离

```yaml
save:
  current_location:
  in_game_date_time:
  player_state_ref:
  inventory_ref:
  relationship_state_ref:
  task_state_ref:
  world_state_ref:
  latest_session_log_ref:
  player_known_facts: []
  rumors_and_clues: []
  player_inferences: []
  host_only_state_ref: # 单独保存；不得并入玩家可见存档
```

每次重大行动、交易、受伤、突破、关系改变或明显时间跳跃后更新相关状态和日志。玩家可见存档只包含角色可知信息；主持端隐藏状态须独立保存并标明访问边界。

## 9. 开局确认清单

- [ ] 玩家确认本局地点、角色生成方式和随机字段范围。
- [ ] 本局日历、游戏日期和日内计时口径已确认或明确标为待确认。
- [ ] 角色摘要已由玩家确认，之后才创建正式角色存档。
- [ ] NPC 角色位是否启用、随机/指定及保留项已记录。
- [ ] 资源单位和暂定数值口径注明来源与确定程度。
- [ ] 地点、势力、事件和测试内容的正史状态明确。
- [ ] 玩家可见存档与主持端隐藏状态分开保存。
- [ ] 开局场景提供可观察信息和自由行动空间，不强迫接受主线任务。
