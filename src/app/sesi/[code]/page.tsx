import ClassSessionJoinClient from "@/components/ClassSessionJoinClient";

export default async function ClassSessionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ClassSessionJoinClient code={code} />;
}
