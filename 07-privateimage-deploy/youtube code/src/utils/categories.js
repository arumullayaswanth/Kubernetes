import { AiOutlineHome, AiFillHome } from "react-icons/ai";
import { BsLaptop, BsLaptopFill } from "react-icons/bs";
import { TiCodeOutline, TiCode } from "react-icons/ti";
import { MdOutlineCloud, MdCloud } from "react-icons/md";
import { SiKubernetes } from "react-icons/si";
import { FaDocker } from "react-icons/fa";
import { VscGitMerge } from "react-icons/vsc";
import { MdOutlineSecurity, MdSecurity } from "react-icons/md";

const categories = [
  {
    id: 1,
    name: "Home",
    icon: <AiOutlineHome style={{ height: "22px", width: "30px" }} />,
    active: <AiFillHome style={{ height: "22px", width: "30px" }} />,
  },
  {
    id: 2,
    name: "DevOps",
    icon: <TiCodeOutline style={{ height: "22px", width: "30px" }} />,
    active: <TiCode style={{ height: "22px", width: "30px" }} />,
  },
  {
    id: 3,
    name: "Kubernetes",
    icon: <SiKubernetes style={{ height: "22px", width: "30px" }} />,
    active: <SiKubernetes style={{ height: "22px", width: "30px" }} />,
  },
  {
    id: 4,
    name: "AWS",
    icon: <MdOutlineCloud style={{ height: "22px", width: "30px" }} />,
    active: <MdCloud style={{ height: "22px", width: "30px" }} />,
  },
  {
    id: 5,
    name: "Docker",
    icon: <FaDocker style={{ height: "22px", width: "30px" }} />,
    active: <FaDocker style={{ height: "22px", width: "30px" }} />,
  },
  {
    id: 6,
    name: "CI/CD",
    icon: <VscGitMerge style={{ height: "22px", width: "30px" }} />,
    active: <VscGitMerge style={{ height: "22px", width: "30px" }} />,
  },
  {
    id: 7,
    name: "Security",
    icon: <MdOutlineSecurity style={{ height: "22px", width: "30px" }} />,
    active: <MdSecurity style={{ height: "22px", width: "30px" }} />,
  },
  {
    id: 8,
    name: "Technology",
    icon: <BsLaptop style={{ height: "22px", width: "30px" }} />,
    active: <BsLaptopFill style={{ height: "22px", width: "30px" }} />,
  },
];

export default categories;
