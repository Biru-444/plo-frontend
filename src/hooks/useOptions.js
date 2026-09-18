import { useEffect, useState } from "react";

export default function useOptions(listFn, mapToOptions) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    listFn().then((data) => setOptions(mapToOptions(data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return options;
}
