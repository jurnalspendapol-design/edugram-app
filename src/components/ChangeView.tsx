import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== -6.2 || center[1] !== 106.8) {
      map.flyTo(center, 13, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, map]);
  return null;
};

export default ChangeView;
