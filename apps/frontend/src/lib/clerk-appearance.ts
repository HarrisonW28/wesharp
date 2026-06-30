import { shadcn } from "@clerk/themes";
import type { Appearance } from "@clerk/types";

/** Clerk auth UI — tracks WeSharp shadcn tokens and `.dark` from next-themes. */
export const clerkAppearance: Appearance = {
  baseTheme: shadcn,
  variables: {
    borderRadius: "0.625rem",
  },
};
