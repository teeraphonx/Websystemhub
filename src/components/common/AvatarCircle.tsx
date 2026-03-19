import divisionLogo from '../../assets/logo-division-login-cropped.png';

export default function AvatarCircle() {
  return (
    <div className="relative mb-5">
      <div className="absolute -inset-3 rounded-full bg-blue-500/22 blur-lg animate-pulse"></div>
      <div className="relative z-10 flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-[#060813] p-[3px] shadow-[0_0_18px_rgba(37,99,235,0.45)]">
        <img
          src={divisionLogo}
          alt="Cyber Crime Investigation Bureau badge"
          className="h-full w-full object-contain object-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
        />
      </div>
    </div>
  );
}