import { FollowListClient } from "../FollowListClient";

export default async function FollowingPage(
  props: PageProps<"/users/[id]/following">,
) {
  const { id } = await props.params;

  return <FollowListClient userId={id} type="following" />;
}
