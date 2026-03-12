/**
 * 迷子 (Missing Child) 桌游类型与卡牌数据
 * 参考: Temp_Maigo MissingChildCardList.json + MC_Server
 */

export type CardKind = 'MAIGO' | 'BRIGHT' | 'DARK';

export interface CardDef {
  id: number;
  name: string;
  type: CardKind;
  description: string;
  /** 使用时的目标数（0/1/2 等） */
  index_num: number;
  /** 额外回合数 */
  extra_round: number;
}

/** 卡牌在游戏中的实例：全局唯一，抽他人牌时看背面、以 instanceId 指定 */
export interface CardRef {
  /** 牌面类型 id（0–33，对应 CARD_DEFS） */
  cardId: number;
  /** 全局唯一实例 id，发牌时分配；抽他人牌按此 id 指定 */
  instanceId: number;
}

export interface Player {
  id: number;
  name: string;
  /** 手牌（CardRef[]） */
  hand: CardRef[];
  /** 是否存活；当前仅在 Bad End 自爆后设为 false */
  alive: boolean;
  /** 血量：初始 7 上限 7，Happy End +2（ cap 7），Bad End -3，Normal 非胜者 -1 */
  hp: number;
  /** 本回合从左侧玩家抽到的牌（未选时 null） */
  drawnCard: CardRef | null;
  /** 本回合是否已结束出牌 */
  actionEnd: boolean;
  /** 是否为 Bad End 永久出局（自爆），true 则不参与新一轮 */
  badEnded?: boolean;
  /** 是否已 Happy End（手牌打空）：本轮跳过回合，下一轮正常参与 */
  happyEnded?: boolean;
}

export type GamePhase = 'waiting' | 'playing' | 'game_end';

/** Good=牌打光 Happy End, Bad=自爆, Normal=最后一人, RoundsComplete=3 轮后血量最多 */
export type EndReason = 'Playing' | 'Good' | 'Bad' | 'Normal' | 'RoundsComplete';

/** 日志条目类型 */
export type LogEntryType =
  | 'turn_start'      // 回合开始
  | 'turn_skip'       // 跳过回合
  | 'draw_from_left'  // 从上家抽牌
  | 'draw_from_deck'  // 从牌库抽牌
  | 'play_card'       // 打出卡牌
  | 'card_effect'     // 卡牌效果
  | 'extra_action'    // 获得额外行动
  | 'bad_end'         // 自爆（Bad End）
  | 'happy_end'       // Happy End
  | 'game_end';       // 游戏结束

/** 单条日志 */
export interface LogEntry {
  id: string;
  type: LogEntryType;
  /** 轮次数 (0-based) */
  round: number;
  /** 回合数 (从 1 开始) */
  turn?: number;
  /** 当前玩家索引 */
  playerIndex: number;
  /** 时间戳 */
  timestamp: number;
  /** 主要信息 */
  message: string;
  /** 详细描述 */
  detail?: string;
  /** 相关卡牌 */
  cardName?: string;
  /** 来源玩家（用于抽牌） */
  fromPlayerIndex?: number;
  /** 目标玩家（用于效果） */
  targetPlayerIndex?: number;
}

/** 待处理的效果类型 */
export type PendingEffectType =
  | 'bright_street_return' // 明亮的街道 3/4/5：将刚打出的牌取回手牌
  | 'police_station'       // 派出所 12：将一张迷子放回牌库顶
  | 'amulet_protect'       // 护身符 8：选一张手牌设为保护
  | 'lighthouse_designate' // 灯塔 16：选一张手牌指定给下家
  | 'rumor_pick'           // 传闻 7/31：看牌库，可取一张迷子
  | 'tunnel_discard'       // 隧道 28：有>=2张亮牌的玩家依次弃1张
  | 'discard_to_hand'      // 回头 9：从弃牌堆选一张加入手牌
  | 'aquarium_pick'        // 水族馆 11：玩家选一张牌待交换
  | 'pick_player_draw2'    // 电话亭 14：选一名玩家抽两张
  | 'pick_player_swap_top' // 投币洗衣机 15：选一名玩家，手牌与牌库顶交换
  | 'convenience_store'    // 便利店 17：看牌库顶3张选1张
  | 'pick_player_draw1'    // 分岔路 27：选一名玩家抽一张
  | 'shrine_pick_target'   // 神社 29：选手牌最多的玩家
  | 'transfer_all_maigo'   // 小黑崎 33：选一名玩家，将所有迷子交给他
  | 'river_pick'           // 河 24：选一张牌给左手边
  | 'crossroad_draw'       // 平交道 6：展示从牌库顶抽到的牌，结算 Bad End 前的动画暂停
  ;

/** 待处理的效果状态 */
export interface PendingEffect {
  type: PendingEffectType;
  /** 效果触发者 */
  triggeredBy: number;
  /** 当前步骤（用于多步效果） */
  step?: number;
  /** 已收集的选择（玩家索引 -> 卡牌 instanceId） */
  selections?: Record<number, number>;
  /** 目标玩家（用于需要选择玩家的效果） */
  targetPlayer?: number;
  /** 临时数据（如便利店查看的3张牌、传闻查看的牌库） */
  tempCards?: CardRef[];
  /** 需要依次行动的玩家 id 列表（如隧道、水族馆、河） */
  affectedPlayers?: number[];
  /** 平交道抽到的牌（crossroad_draw 时使用） */
  card?: CardRef;
}

export interface MissingChildGameState {
  phase: GamePhase;
  players: Player[];
  /** 牌堆（顶为 last） */
  deck: CardRef[];
  /** 弃牌堆 */
  discard: CardRef[];
  /** 当前回合玩家索引 */
  currentPlayerIndex: number;
  /** 已完成的轮数（0/1/2），到 3 即结束按血量判胜 */
  round: number;
  /** 当前回合数（从 1 开始，每玩家行动一次递增） */
  turn: number;
  /** 本回合剩余可出牌次数；打出带 extra_round 的牌会 +1/+2 可再出牌 */
  playsLeft: number;
  /** 下一张要发的 instanceId */
  nextInstanceId: number;
  /** 游戏结束原因等 */
  endReason: EndReason | null;
  /** 本回合已结束，等待当前玩家点击确认后进入下一人 */
  turnEndPending?: boolean;
  /** 待确认后的下一家索引 */
  pendingNextPlayerIndex?: number;
  /** 待确认后的轮次（仅当跨轮时设置） */
  pendingRound?: number;
  /** 牌库顶是否为迷子（由派出所、传闻等技能放置，用于显示不同牌背） */
  deckTopIsMaigo?: boolean;
  /** 待处理的效果（需要玩家选择的卡牌效果） */
  pendingEffect?: PendingEffect;
  /** Bad End 动画状态 */
  badEndAnimation?: {
    playerIndex: number;
    hand: CardRef[];
    bvid: string;
  };
  /** 护身符/灯塔标记：下家抽牌时由指定玩家挑选 */
  protectedDraw?: {
    /** 被抽牌的玩家 */
    targetPlayer: number;
    /** 由谁挑选（通常是被抽牌的玩家自己） */
    pickedBy: number;
    /** 效果来源：'amulet'(护身符8) 或 'lighthouse'(灯塔16) */
    source: 'amulet' | 'lighthouse';
    /** 护身符：禁止被抽的牌；灯塔：必须被抽的牌 */
    instanceId?: number;
  };
  /** Normal End 发生后等待确认，true 时 phase 仍为 playing，玩家确认后才进入 game_end */
  gameEndPending?: boolean;
  /** 游戏日志 */
  logs: LogEntry[];
}

/** 卡牌定义表（id 0–33，与 MissingChildCardList.json 一致） */
export const CARD_DEFS: CardDef[] = [
  { id: 0, name: '迷子', type: 'MAIGO', description: '这张卡不能打出到场上', index_num: 0, extra_round: 0 },
  { id: 1, name: '迷子', type: 'MAIGO', description: '这张卡不能打出到场上', index_num: 0, extra_round: 0 },
  { id: 2, name: '迷子', type: 'MAIGO', description: '这张卡不能打出到场上', index_num: 0, extra_round: 0 },
  { id: 3, name: '明亮的街道', type: 'BRIGHT', description: '使用这张卡时，若你的手牌中只有[迷子]，则你可以将这张卡放回手牌', index_num: 0, extra_round: 0 },
  { id: 4, name: '明亮的街道', type: 'BRIGHT', description: '使用这张卡时，若你的手牌中只有[迷子]，则你可以将这张卡放回手牌', index_num: 0, extra_round: 0 },
  { id: 5, name: '明亮的街道', type: 'BRIGHT', description: '使用这张卡时，若你的手牌中只有[迷子]，则你可以将这张卡放回手牌', index_num: 0, extra_round: 0 },
  { id: 6, name: '平交道', type: 'BRIGHT', description: '从牌堆中抽一张卡，此时若抽到[迷子]，则无论你的手牌中有什么牌，都直接进入[BAD END]', index_num: 0, extra_round: 2 },
  { id: 7, name: '传闻', type: 'BRIGHT', description: '查看整个牌堆，若其中有[迷子]，可以抽取一张，并将牌堆洗混。在此之后，将[迷子]放回牌堆顶部', index_num: 1, extra_round: 1 },
  { id: 8, name: '护身符', type: 'BRIGHT', description: '下一个玩家从你手中抽牌时，由你挑选一张牌。仅在这一回合中，那位玩家不能抽取这张卡。（剩余一张卡时效果不发动）', index_num: 0, extra_round: 0 },
  { id: 9, name: '回头', type: 'BRIGHT', description: '从弃牌堆任意选择一张卡加入手牌', index_num: 1, extra_round: 0 },
  { id: 10, name: '来电', type: 'BRIGHT', description: '你左手边的玩家从牌堆抽取一张卡', index_num: 0, extra_round: 1 },
  { id: 11, name: '水族馆', type: 'BRIGHT', description: '每个玩家从自己手牌中选择一张卡，将这些卡打乱后随即分发给所有玩家', index_num: 0, extra_round: 0 },
  { id: 12, name: '派出所', type: 'BRIGHT', description: '当你的手牌中有[迷子]时，你可以将[迷子]放回牌堆顶部', index_num: 0, extra_round: 0 },
  { id: 13, name: '人行横道', type: 'BRIGHT', description: '手牌中有[迷子]的玩家按顺序从牌库中抽取一张牌', index_num: 0, extra_round: 0 },
  { id: 14, name: '电话亭', type: 'BRIGHT', description: '选择一名玩家（包括你自己），从牌堆中抽取两张牌，并将其加入手牌', index_num: 1, extra_round: 0 },
  { id: 15, name: '投币洗衣机', type: 'BRIGHT', description: '选择一名玩家（包括你自己），从手牌中选择一张牌，与牌库顶端的牌交换', index_num: 1, extra_round: 1 },
  { id: 16, name: '灯塔', type: 'BRIGHT', description: '下一个玩家从你手中抽牌时，由你挑选一张牌。（剩余一张卡时效果不发动）', index_num: 0, extra_round: 0 },
  { id: 17, name: '便利店', type: 'BRIGHT', description: '查看排队顶部的3张卡，选择其中的1张加入手牌，并将其余的牌以任意顺序放回牌堆顶部', index_num: 2, extra_round: 1 },
  { id: 18, name: '坏掉的街灯', type: 'DARK', description: '可以将两张及以上[坏掉的街灯]一起打出', index_num: 0, extra_round: 0 },
  { id: 19, name: '坏掉的街灯', type: 'DARK', description: '可以将两张及以上[坏掉的街灯]一起打出', index_num: 0, extra_round: 0 },
  { id: 20, name: '坏掉的街灯', type: 'DARK', description: '可以将两张及以上[坏掉的街灯]一起打出', index_num: 0, extra_round: 0 },
  { id: 21, name: '坏掉的街灯', type: 'DARK', description: '可以将两张及以上[坏掉的街灯]一起打出', index_num: 0, extra_round: 0 },
  { id: 22, name: '坏掉的街灯', type: 'DARK', description: '可以将两张及以上[坏掉的街灯]一起打出', index_num: 0, extra_round: 0 },
  { id: 23, name: '雨', type: 'DARK', description: '所有玩家按序从牌库抽取一张牌（从左侧第一位玩家开始）', index_num: 0, extra_round: 0 },
  { id: 24, name: '河', type: 'DARK', description: '所有玩家从手中选择一张卡，交给左手边玩家', index_num: 0, extra_round: 0 },
  { id: 25, name: '海', type: 'DARK', description: '将所有手牌放入牌堆，再洗混牌堆，抽取相同数量牌', index_num: 0, extra_round: 0 },
  { id: 26, name: '小道', type: 'DARK', description: '从牌堆中抽取两张牌，并将其加入手牌', index_num: 0, extra_round: 0 },
  { id: 27, name: '分岔路', type: 'DARK', description: '选择一名玩家，从牌堆抽取一张牌，在此之后，你也从牌堆抽取一张牌', index_num: 1, extra_round: 0 },
  { id: 28, name: '隧道', type: 'DARK', description: '所有手牌中有两张以上光亮牌的玩家从手中弃置一张光亮牌', index_num: 0, extra_round: 0 },
  { id: 29, name: '神社', type: 'DARK', description: '选择一位手牌最多的玩家，所有玩家将手牌中的[迷子]交给这位玩家', index_num: 0, extra_round: 0 },
  { id: 30, name: '公园', type: 'DARK', description: '从牌堆中抽取一张牌，并将其加入手牌', index_num: 0, extra_round: 0 },
  { id: 31, name: '传闻', type: 'DARK', description: '查看整个牌堆，若其中有[迷子]，可以抽取一张，并将牌堆洗混。在此之后，将[迷子]放回牌堆顶部', index_num: 0, extra_round: 0 },
  { id: 32, name: '小神白', type: 'BRIGHT', description: '无效果', index_num: 0, extra_round: 2 },
  { id: 33, name: '小黑崎', type: 'DARK', description: '选择一名玩家，将你手牌中所有的[迷子]交给这位玩家', index_num: 1, extra_round: 0 },
];

const MAIGO_IDS = new Set([0, 1, 2]);
const BRIGHT_IDS = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 32]);

export function getCardDef(cardId: number): CardDef | undefined {
  return CARD_DEFS.find(c => c.id === cardId);
}

export function isMaigo(cardId: number): boolean {
  return MAIGO_IDS.has(cardId);
}

export function isBright(cardId: number): boolean {
  return BRIGHT_IDS.has(cardId);
}

export function canPlayToField(cardId: number): boolean {
  return !MAIGO_IDS.has(cardId);
}
