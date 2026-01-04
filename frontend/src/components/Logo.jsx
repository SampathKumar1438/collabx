import LogoImg from "../assets/collabx.png";

function Logo() {
  return (
    <div className="flex flex-row items-center space-x-2">
      <img src={LogoImg} alt="CollabX" className="w-8 h-8 object-contain" />
      <div className="text-2xl font-medium text-body dark:text-white">
        CollabX
      </div>
    </div>
  );
}

export default Logo;
