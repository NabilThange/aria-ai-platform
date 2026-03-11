"use client";
import "@/styles/revbtn.css";

interface AnimateBtnProps {
  btnName: string;
}

const AnimateBtn = ({ btnName }: AnimateBtnProps) => {
  return (
    <div className="link-line">
      <a href="#" className="rev-link rev-top text-[12px]">{btnName}</a>
      <a href="#" className="rev-link text-[12px]">{btnName}</a>
    </div>
  );
};

export default AnimateBtn;
