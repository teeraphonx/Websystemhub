import UserProfileCard from '../../components/user/UserProfileCard';

interface UserProfilePageProps {
  username: string;
  email: string;
  fullName: string;
  organizationDivision: string;
  organizationStatus: 'verified' | 'pending' | 'rejected';
  organizationVerificationRequestStatus?: 'pending' | 'approved' | 'rejected';
  userReservations: number;
  onOpenVerification: () => void;
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
        fullName={props.fullName}
        organizationDivision={props.organizationDivision}
        organizationStatus={props.organizationStatus}
        organizationVerificationRequestStatus={
          props.organizationVerificationRequestStatus
        }
        userReservations={props.userReservations}
        onOpenVerification={props.onOpenVerification}
        onOpenChangePassword={props.onOpenChangePassword}
        onOpenHistory={props.onOpenHistory}
        onLogout={props.onLogout}
      />
    </div>
  );
}
