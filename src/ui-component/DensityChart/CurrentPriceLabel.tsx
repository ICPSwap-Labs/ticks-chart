import { ChartEntry } from "./index";
import { GridAutoRows, RowFixed } from "ui-component/Grid/index";
import { Typography, Box } from "@mui/material";
import { Token } from "sdk-core/index";

interface LabelProps {
  x: number;
  y: number;
  index: number;
}

interface CurrentPriceLabelProps {
  data: ChartEntry[] | undefined;
  chartProps: any;
  token0: Token | undefined;
  token1: Token | undefined;
}

export function CurrentPriceLabel({ data, chartProps, token0, token1 }: CurrentPriceLabelProps) {
  const labelData = chartProps as LabelProps;
  const entryData = data?.[labelData.index];

  if (entryData?.isCurrent) {
    const price0 = entryData.price0;
    const price1 = entryData.price1;

    return (
      <g>
        <foreignObject x={labelData.x - 80} y={318} width={"100%"} height={100}>
          <Box
            sx={{
              borderRadius: "8px",
              padding: "3px 12px",
              width: "fit-content",
              fontSize: "14px",
              backgroundColor: "#29314f",
            }}
          >
            <GridAutoRows gap="6px">
              <RowFixed align="center">
                <Typography color="#ffffff" mr="6px">
                  Current Price
                </Typography>
                <div
                  style={{
                    marginTop: "2px",
                    height: "6px",
                    width: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#8672FF",
                  }}
                ></div>
              </RowFixed>
              <Typography color="#ffffff">{`1 ${token0?.symbol} = ${price0} ${token1?.symbol}`}</Typography>
              <Typography color="#ffffff">{`1 ${token1?.symbol} = ${price1} ${token0?.symbol}`}</Typography>
            </GridAutoRows>
          </Box>
        </foreignObject>
      </g>
    );
  }
  return null;
}
