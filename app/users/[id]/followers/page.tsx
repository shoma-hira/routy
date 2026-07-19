import { FollowListClient } from "../FollowListClient";

export default async function FollowersPage(
  props: PageProps<"/users/[id]/followers">,
) {
  const { id } = await props.params;

  return <FollowListClient userId={id} type="followers" />;
}
