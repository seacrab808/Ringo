import { TaskPageView } from "@/components/task/task-page-view";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TaskPageView taskId={id} />;
}
