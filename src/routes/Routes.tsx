import { Route, Switch, useLocation } from "react-router-dom";
import MainLayout from "ui-component/MainLayout";

import Index from "../views/index";

export default function MainRoutes() {
  const location = useLocation();

  return (
    <Route path={["/"]}>
      <MainLayout>
        <Switch location={location} key={location.pathname}>
          <Route exact path="/" component={Index} />
        </Switch>
      </MainLayout>
    </Route>
  );
}
