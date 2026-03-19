import UserProfileCard from '../../components/user/UserProfileCard';

interface UserProfilePageProps {
  username: string;
  userReservations: number;
  onOpenChangePassword: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
}

export default function UserProfilePage(props: UserProfilePageProps) {
  return (
    <div className="flex justify-center items-start pt-6 animate-fade-up">
      <UserProfileCard
        username={props.username}
        userReservations={props.userReservations}
        onOpenChangePassword={props.onOpenChangePassword}
        onOpenHistory={props.onOpenHistory}
        onLogout={props.onLogout}
      />
    </div>
  );
}