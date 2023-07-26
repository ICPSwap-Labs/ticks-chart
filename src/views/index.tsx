import DensityChart from "ui-component/DensityChart";

const poolId = "3ejs3-eaaaa-aaaag-qbl2a-cai"; // SNS/ICP

// token0's price
const token0Price = 716.3012453572662;

export default function SwapPoolDetails() {
  return <DensityChart address={poolId} token0Price={token0Price}></DensityChart>;
}
