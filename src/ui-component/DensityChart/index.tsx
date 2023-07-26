import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, LabelList, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Box } from "@mui/material";
import styled from "styled-components";
import { Pool, TickMath, TICK_SPACINGS, FeeAmount } from "sdk/index";
import { Token, CurrencyAmount } from "sdk-core/index";
import JSBI from "jsbi";
import { useTicksSurroundingPrice, TickProcessed } from "hooks/usePoolTickChartData";

import { CurrentPriceLabel } from "./CurrentPriceLabel";
import CustomToolTip from "./CustomToolTip";

const MAX_UINT128 = BigInt(340282366920938463463374607431768211455);

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 500px;
`;

interface DensityChartProps {
  address: string;
  token0Price: number | undefined;
}

export interface ChartEntry {
  index: number;
  isCurrent: boolean;
  activeLiquidity: number;
  price0: number;
  price1: number;
  tvlToken0: number;
  tvlToken1: number;
}

interface ZoomStateProps {
  left: number;
  right: number;
  refAreaLeft: string | number;
  refAreaRight: string | number;
}

const INITIAL_TICKS_TO_FETCH = 200;

const initialState = {
  left: 0,
  right: INITIAL_TICKS_TO_FETCH * 2 + 1,
  refAreaLeft: "",
  refAreaRight: "",
};

// Swap pools's metadata
// SwapPool().metadata()
const poolMetadata = {
  fee: BigInt(3000),
  key: "ryjl3-tyaaa-aaaaa-aaaba-cai_zfcdd-tqaaa-aaaaq-aaaga-cai_3000",
  liquidity: BigInt(5651347183),
  maxLiquidityPerTick: BigInt(11505743598341114571880798222544994),
  sqrtPriceX96: BigInt(5941537413636030270973434565),
  tick: BigInt(-51810),
  token0: {
    address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
    standard: "ICP",
  },
  token1: {
    address: "zfcdd-tqaaa-aaaaq-aaaga-cai",
    standard: "ICRC1",
  },
};

const ICP = new Token({
  address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  decimals: 8,
  symbol: "ICP",
  name: "Internet Computer",
  transFee: Number(10000),
  standard: "ICP",
});

const SNS1 = new Token({
  address: "zfcdd-tqaaa-aaaaq-aaaga-cai",
  decimals: 8,
  symbol: "SNS1",
  name: "SNS1",
  transFee: Number(10000),
  standard: "ICRC1",
});

export default function DensityChart({ address, token0Price }: DensityChartProps) {
  const token0 = ICP;
  const token1 = SNS1;

  const fee = poolMetadata?.fee;

  const { data: poolTickData } = useTicksSurroundingPrice(poolMetadata, token0, token1);

  const [loading, setLoading] = useState(false);
  const [zoomState] = useState<ZoomStateProps>(initialState);

  const [formattedData, setFormattedData] = useState<ChartEntry[] | undefined>();

  useEffect(() => {
    async function formatData() {
      if (poolTickData && poolMetadata && token0 && token1 && fee) {
        const newData = await Promise.all(
          poolTickData.ticksProcessed.map(async (t: TickProcessed, i) => {
            const active = t.tickIndex === poolTickData.activeTickIdx;
            const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(t.tickIndex);
            const feeAmount: FeeAmount = Number(fee);

            const mockTicks = [
              {
                index: t.tickIndex - TICK_SPACINGS[feeAmount],
                liquidityGross: t.liquidityGross,
                liquidityNet: JSBI.multiply(t.liquidityNet, JSBI.BigInt("-1")),
              },
              {
                index: t.tickIndex,
                liquidityGross: t.liquidityGross,
                liquidityNet: t.liquidityNet,
              },
            ];

            const pool =
              token0 && token1 && fee
                ? new Pool(
                    address,
                    token0,
                    token1,
                    Number(fee),
                    sqrtPriceX96,
                    t.liquidityActive,
                    t.tickIndex,
                    mockTicks
                  )
                : undefined;

            const nextSqrtX96 = poolTickData.ticksProcessed[i - 1]
              ? TickMath.getSqrtRatioAtTick(poolTickData.ticksProcessed[i - 1].tickIndex)
              : undefined;
            const maxAmountToken0 = token0 ? CurrencyAmount.fromRawAmount(token0, MAX_UINT128.toString()) : undefined;
            const outputRes0 =
              pool && maxAmountToken0 ? await pool.getOutputAmount(maxAmountToken0, nextSqrtX96) : undefined;

            const token1Amount = outputRes0?.[0] as CurrencyAmount<Token> | undefined;

            const amount0 = token1Amount ? parseFloat(token1Amount.toExact()) * parseFloat(t.price1) : 0;
            const amount1 = token1Amount ? parseFloat(token1Amount.toExact()) : 0;

            return {
              index: i,
              isCurrent: active,
              activeLiquidity: parseFloat(t.liquidityActive.toString()),
              price0: parseFloat(t.price0),
              price1: parseFloat(t.price1),
              tvlToken0: amount0,
              tvlToken1: amount1,
            };
          })
        );
        // offset the values to line off bars with TVL used to swap across bar
        newData
          ?.map((entry, i) => {
            if (i > 0) {
              newData[i - 1].tvlToken0 = entry.tvlToken0;
              newData[i - 1].tvlToken1 = entry.tvlToken1;
            }
            return undefined;
          })
          .filter((ele) => !!ele);

        if (newData) {
          setLoading(false);
          setFormattedData(newData);
        }

        return;
      } else {
        return [];
      }
    }

    if (!formattedData) {
      setLoading(true);
      formatData();
    }
  }, [fee, formattedData, setLoading, loading, poolMetadata, poolTickData, token0, token1]);

  const zoomedData = useMemo(() => {
    if (formattedData) {
      return formattedData.slice(zoomState.left, zoomState.right);
    }
    return undefined;
  }, [formattedData, zoomState.left, zoomState.right]);

  // reset data on address change
  useEffect(() => {
    setFormattedData(undefined);
  }, [address]);

  const CustomBar = ({
    x,
    y,
    width,
    height,
    fill,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
  }) => {
    return (
      <g>
        <rect x={x} y={y} fill={fill} width={width} height={height} rx="2" />
      </g>
    );
  };

  return (
    <Wrapper>
      {!loading ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            width={500}
            height={300}
            data={zoomedData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <Tooltip
              content={(props) => (
                <CustomToolTip chartProps={props} token0={token0} token1={token1} currentPrice={token0Price} />
              )}
            />
            <XAxis reversed={true} tick={false} />
            <Bar
              dataKey="activeLiquidity"
              fill="#5669dc"
              isAnimationActive={false}
              shape={(props) => {
                // eslint-disable-next-line react/prop-types
                return (
                  <CustomBar height={props.height} width={props.width} x={props.x} y={props.y} fill={props.fill} />
                );
              }}
            >
              {zoomedData?.map((entry, index) => {
                return <Cell key={`cell-${index}`} fill={entry.isCurrent ? "#8672FF" : "#5669dc"} />;
              })}

              <LabelList
                dataKey="activeLiquidity"
                position="inside"
                content={(props) => (
                  <CurrentPriceLabel chartProps={props} token0={token0} token1={token1} data={zoomedData} />
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Box
          sx={{
            position: "absolute",
            display: "flex",
            alignItems: "center",
            top: "0",
            left: "0",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#1a223f",
            zIndex: 100,
          }}
        >
          loading...
        </Box>
      )}
    </Wrapper>
  );
}
