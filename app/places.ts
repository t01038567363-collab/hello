export type Place = {
  id: string;
  name: string;
  region: string;
  description: string;
  theme: "harbor" | "river";
  location: { lat: number; lng: number };
  heading: number;
};

export const PLACES: Place[] = [
  {
    id: "sacheon-harbor",
    name: "삼천포 항구",
    region: "경남 사천",
    description: "바닷바람과 항구 풍경을 떠올리는 산책길",
    theme: "harbor",
    location: { lat: 34.9235, lng: 128.0695 },
    heading: 90,
  },
  {
    id: "jinju-river",
    name: "진주 남강",
    region: "경남 진주",
    description: "남강을 따라 천천히 걷는 산책길",
    theme: "river",
    location: { lat: 35.1916, lng: 128.0788 },
    heading: 90,
  },
];
