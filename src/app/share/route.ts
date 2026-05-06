import { redirect } from "next/navigation";

export async function POST(request: Request) {
  const form = await request.formData();
  const sharedText = [form.get("title"), form.get("text"), form.get("url")]
    .filter(Boolean)
    .map(String)
    .join("\n");

  const params = new URLSearchParams();
  if (sharedText) params.set("shared", sharedText.slice(0, 1000));

  redirect(`/${params.size ? `?${params.toString()}` : ""}`);
}
