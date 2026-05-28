import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy route — new profiles are created via name → edit-profile. */
export default function NewProfileConfigRedirect() {
  const { id, fcuPosition, firemode } = useLocalSearchParams<{
    id?: string;
    fcuPosition?: string;
    firemode?: string;
  }>();

  return (
    <Redirect
      href={{
        pathname: '/replicas/[id]/new-profile/name',
        params: {
          id: id ?? '',
          fcuPosition: fcuPosition ?? '',
          firemode: firemode ?? '',
        },
      }}
    />
  );
}
