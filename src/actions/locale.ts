"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setLocale(locale: string) {
  const validLocale = ["zh", "en"].includes(locale) ? locale : "zh";
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", validLocale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
