import { ReactNode } from "react";
import { makeStyles } from "@mui/styles";
import { CssBaseline } from "@mui/material";

const useStyles = makeStyles(() => {
  return {
    content: {
      width: "100%",
      minHeight: "calc(100vh)",
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      background: "#1a223f",
    },
  };
});

export default function MainLayout({ children }: { children: ReactNode }) {
  const classes = useStyles();

  return (
    <div>
      <CssBaseline />

      <main className={classes.content}>{children}</main>
    </div>
  );
}
