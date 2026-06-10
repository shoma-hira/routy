import { PostDetailClient } from "./PostDetailClient";

export default async function PostDetailPage(props: PageProps<"/posts/[id]">) {
  const { id } = await props.params;

  return <PostDetailClient postId={id} />;
}
