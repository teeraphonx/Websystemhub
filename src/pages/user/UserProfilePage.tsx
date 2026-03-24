import UserProfileCard from '../../components/user/UserProfileCard';

interface UserProfilePageProps {
  username: string;
  email: string;
  userReservations: number;
  onOpenChangePassword: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
}

export default function UserProfilePage(props: UserProfilePageProps) {
  return (
    <div className="flex items-start justify-center pt-6 animate-fade-up">
      <UserProfileCard
        username={props.username}
        email={props.email}
        userReservations={props.userReservations}
        onOpenChangePassword={props.onOpenChangePassword}
        onOpenHistory={props.onOpenHistory}
        onLogout={props.onLogout}
      />
    </div>
  );
}
