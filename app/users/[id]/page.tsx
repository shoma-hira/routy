import { UserProfileClient } from "./UserProfileClient";

export default async function UserProfilePage(props: PageProps<"/users/[id]">) {
  const { id } = await props.params;

  return <UserProfileClient userId={id} />;
}
