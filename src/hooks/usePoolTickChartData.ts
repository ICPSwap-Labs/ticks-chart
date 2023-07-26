import JSBI from "jsbi";
import keyBy from "lodash/keyBy";
import { TickMath, tickToPrice } from "sdk/index";

// All ticks of swap pool
// SwapPool().getTicks
import Ticks from "../ticks.json";
import { Token } from "sdk-core";

const PRICE_FIXED_DIGITS = 18;
const DEFAULT_SURROUNDING_TICKS = 300;

const FEE_TIER_TO_TICK_SPACING = (feeTier: string): number => {
  switch (feeTier) {
    case "10000":
      return 200;
    case "3000":
      return 60;
    case "500":
      return 10;
    case "100":
      return 1;
    default:
      throw Error(`Tick spacing for fee tier ${feeTier} undefined.`);
  }
};

export interface PoolMetadata {
  fee: bigint;
  key: string;
  sqrtPriceX96: bigint;
  tick: bigint;
  liquidity: bigint;
  token0: { address: string; standard: string };
  token1: { address: string; standard: string };
  maxLiquidityPerTick: bigint;
}

// Tick with fields parsed to JSBIs, and active liquidity computed.
export interface TickProcessed {
  liquidityGross: JSBI;
  liquidityNet: JSBI;
  tickIndex: number;
  liquidityActive: JSBI;
  price0: string;
  price1: string;
}

export interface PoolTickData {
  ticksProcessed: TickProcessed[];
  feeTier: string;
  tickSpacing: number;
  activeTickIdx: number;
}

export interface useTicksSurroundingPriceProps {
  loading?: boolean;
  error?: boolean;
  data?: PoolTickData;
}

export function useTicksSurroundingPrice(
  pool: PoolMetadata | undefined,
  token0: Token,
  token1: Token,
  numSurroundingTicks = DEFAULT_SURROUNDING_TICKS
): useTicksSurroundingPriceProps {
  const { tick: poolCurrentTick, fee: feeTier, liquidity } = pool ?? {};

  if (!token0 || !token1 || !Ticks) return { loading: false, data: undefined };

  const poolCurrentTickIdx = parseInt(String(poolCurrentTick));
  const tickSpacing = FEE_TIER_TO_TICK_SPACING(String(feeTier));

  // The pools current tick isn't necessarily a tick that can actually be initialized.
  // Find the nearest valid tick given the tick spacing.
  const activeTickIdx = Math.floor(poolCurrentTickIdx / tickSpacing) * tickSpacing;

  const tickIdxToInitializedTick = keyBy(Ticks, "tickIndex");

  // If the pool's tick is MIN_TICK (-887272), then when we find the closest
  // initializable tick to its left, the value would be smaller than MIN_TICK.
  // In this case we must ensure that the prices shown never go below/above.
  // what actual possible from the protocol.
  let activeTickIdxForPrice = activeTickIdx;
  if (activeTickIdxForPrice < TickMath.MIN_TICK) {
    activeTickIdxForPrice = TickMath.MIN_TICK;
  }

  if (activeTickIdxForPrice > TickMath.MAX_TICK) {
    activeTickIdxForPrice = TickMath.MAX_TICK;
  }

  const activeTickProcessed: TickProcessed = {
    liquidityActive: JSBI.BigInt(Number(liquidity)),
    tickIndex: activeTickIdx,
    liquidityNet: JSBI.BigInt(0),
    price0: tickToPrice(token0, token1, activeTickIdxForPrice).toFixed(PRICE_FIXED_DIGITS),
    price1: tickToPrice(token1, token0, activeTickIdxForPrice).toFixed(PRICE_FIXED_DIGITS),
    liquidityGross: JSBI.BigInt(0),
  };

  // If our active tick happens to be initialized (i.e. there is a position that starts or
  // ends at that tick), ensure we set the gross and net.
  // correctly.
  const activeTick = tickIdxToInitializedTick[activeTickIdx];
  if (activeTick) {
    activeTickProcessed.liquidityGross = JSBI.BigInt(activeTick.liquidityGross.toString());
    activeTickProcessed.liquidityNet = JSBI.BigInt(activeTick.liquidityNet.toString());
  }

  enum Direction {
    ASC,
    DESC,
  }

  // Computes the numSurroundingTicks above or below the active tick.
  const computeSurroundingTicks = (
    activeTickProcessed: TickProcessed,
    tickSpacing: number,
    numSurroundingTicks: number,
    direction: Direction
  ) => {
    let previousTickProcessed: TickProcessed = {
      ...activeTickProcessed,
    };

    // Iterate outwards (either up or down depending on 'Direction') from the active tick,
    // building active liquidity for every tick.
    let processedTicks: TickProcessed[] = [];
    for (let i = 0; i < numSurroundingTicks; i++) {
      const currentTickIdx =
        direction === Direction.ASC
          ? previousTickProcessed.tickIndex + tickSpacing
          : previousTickProcessed.tickIndex - tickSpacing;

      if (currentTickIdx < TickMath.MIN_TICK || currentTickIdx > TickMath.MAX_TICK) {
        break;
      }

      const currentTickProcessed: TickProcessed = {
        liquidityActive: previousTickProcessed.liquidityActive,
        tickIndex: currentTickIdx,
        liquidityNet: JSBI.BigInt(0),
        price0: tickToPrice(token0, token1, currentTickIdx).toFixed(PRICE_FIXED_DIGITS),
        price1: tickToPrice(token1, token0, currentTickIdx).toFixed(PRICE_FIXED_DIGITS),
        liquidityGross: JSBI.BigInt(0),
      };

      // Check if there is an initialized tick at our current tick.
      // If so copy the gross and net liquidity from the initialized tick.
      const currentInitializedTick = tickIdxToInitializedTick[currentTickIdx.toString()];
      if (currentInitializedTick) {
        currentTickProcessed.liquidityGross = JSBI.BigInt(currentInitializedTick.liquidityGross.toString());
        currentTickProcessed.liquidityNet = JSBI.BigInt(currentInitializedTick.liquidityNet.toString());
      }

      // Update the active liquidity.
      // If we are iterating ascending and we found an initialized tick we immediately apply
      // it to the current processed tick we are building.
      // If we are iterating descending, we don't want to apply the net liquidity until the following tick.
      if (direction === Direction.ASC && currentInitializedTick) {
        currentTickProcessed.liquidityActive = JSBI.add(
          previousTickProcessed.liquidityActive,
          JSBI.BigInt(currentInitializedTick.liquidityNet.toString())
        );
      } else if (direction === Direction.DESC && JSBI.notEqual(previousTickProcessed.liquidityNet, JSBI.BigInt(0))) {
        // We are iterating descending, so look at the previous tick and apply any net liquidity.
        currentTickProcessed.liquidityActive = JSBI.subtract(
          previousTickProcessed.liquidityActive,
          previousTickProcessed.liquidityNet
        );
      }

      processedTicks.push(currentTickProcessed);
      previousTickProcessed = currentTickProcessed;
    }

    if (direction === Direction.DESC) {
      processedTicks = processedTicks.reverse();
    }

    return processedTicks;
  };

  const subsequentTicks: TickProcessed[] = computeSurroundingTicks(
    activeTickProcessed,
    tickSpacing,
    numSurroundingTicks,
    Direction.ASC
  );

  const previousTicks: TickProcessed[] = computeSurroundingTicks(
    activeTickProcessed,
    tickSpacing,
    numSurroundingTicks,
    Direction.DESC
  );

  const ticksProcessed = previousTicks.concat(activeTickProcessed).concat(subsequentTicks);

  return {
    data: {
      ticksProcessed,
      feeTier: String(feeTier),
      tickSpacing,
      activeTickIdx,
    },
  };
}