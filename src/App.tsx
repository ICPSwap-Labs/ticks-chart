import { ThemeProvider } from "@mui/material/styles";
import { StyledEngineProvider } from "@mui/material";
import { Switch } from "react-router-dom";
import AllRoutes from "./routes/Routes";
import theme from "./themes";

export default function App() {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme()}>
        <Switch>
          <AllRoutes />
        </Switch>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
