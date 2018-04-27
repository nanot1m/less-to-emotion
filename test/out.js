import { css } from "emotion";

export default theme => {
  const styles = {
    root: () => css`
      display: inline-block;
    `,
    menuHolder: () => css`
      position: relative;
    `,
    menu: () => css`
      background: ${theme.dropdownMenuBg};
      border: 1px solid ${theme.dropdownMenuBorder};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      left: 0;
      padding: 4px 0;
      position: absolute;
      right: 0;
      top: -1px;
      z-index: 1000;
    `,
    item: () => css`
      padding: 4px 8px;
      .${styles.menu()} {
        padding-left: 25px;
      }
    `,
    itemHover: () => css`
      background: ${theme.dropdownMenuBg};
    `,
    itemPadLeft: () => css`
      padding-left: 25px;
    `
  };

  return {
    root: styles["root"](),
    menuHolder: styles["menuHolder"](),
    menu: styles["menu"](),
    item: styles["item"](),
    itemHover: styles["itemHover"](),
    itemPadLeft: styles["itemPadLeft"]()
  };
};
