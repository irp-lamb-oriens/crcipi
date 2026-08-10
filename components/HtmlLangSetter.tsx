"use client";

import { useEffect } from "react";

interface Props {
  lang: string;
}

export default function HtmlLangSetter({ lang }: Props) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}