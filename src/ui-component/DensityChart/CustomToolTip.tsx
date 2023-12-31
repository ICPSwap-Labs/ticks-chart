import { GridAutoRows, RowBetween } from "ui-component/Grid/index";
import { Typography, Box } from "@mui/material";
import { Token } from "sdk-core/index";

interface CustomToolTipProps {
  chartProps: any;
  token0: Token | undefined;
  token1: Token | undefined;
  currentPrice: number | undefined;
}

export function CustomToolTip({ chartProps, token0, token1, currentPrice }: CustomToolTipProps) {
  const price0 = chartProps?.payload?.[0]?.payload.price0;
  const price1 = chartProps?.payload?.[0]?.payload.price1;
  const tvlToken0 = chartProps?.payload?.[0]?.payload.tvlToken0;
  const tvlToken1 = chartProps?.payload?.[0]?.payload.tvlToken1;

  return (
    <Box
      sx={{
        padding: "12px",
        width: "320px",
        opacity: 0.8,
        zIndex: "10",
        borderRadius: "12px",
        background: "#212946",
        border: `1px solid #29314f`,
      }}
    >
      <GridAutoRows gap="20px 0">
        <Typography color="#ffffff" fontSize="12px">
          Tick stats
        </Typography>

        <RowBetween>
          <Typography color="#ffffff" fontSize="12px">
            {token0?.symbol} Price:{" "}
          </Typography>
          <Typography color="#ffffff" fontSize="12px">
            {price0 ? price0 : ""} {token1?.symbol}
          </Typography>
        </RowBetween>

        <RowBetween>
          <Typography color="#ffffff" fontSize="12px">
            {token1?.symbol} Price:{" "}
          </Typography>
          <Typography color="#ffffff" fontSize="12px">
            {price1 ? price1 : ""} {token0?.symbol}
          </Typography>
        </RowBetween>
        {currentPrice && price0 && currentPrice > price1 ? (
          <RowBetween>
            <Typography color="#ffffff" fontSize="12px">
              {token0?.symbol} Locked:{" "}
            </Typography>
            <Typography color="#ffffff" fontSize="12px">
              {tvlToken0 ? tvlToken0 : ""} {token0?.symbol}
            </Typography>
          </RowBetween>
        ) : (
          <RowBetween>
            <Typography color="#ffffff" fontSize="12px">
              {token1?.symbol} Locked:{" "}
            </Typography>
            <Typography color="#ffffff" fontSize="12px">
              {tvlToken1 ? tvlToken1 : ""} {token1?.symbol}
            </Typography>
          </RowBetween>
        )}
      </GridAutoRows>
    </Box>
  );
}

export default CustomToolTip;
