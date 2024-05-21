import React from "react";
export default function App() {
  const s = /* i18n-disable*/ "hello world";
  const b = "bar";
  const c = `hello ${b}123`;
  return (
    <div>
      {s}
      <p data-txt={`123`} title="123">
        {"foo"}
      </p>
    </div>
  );
}
