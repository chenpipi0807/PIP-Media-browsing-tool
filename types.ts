
export interface ImageItem {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  isFavorited: boolean;
  isVideo?: boolean;
}

export interface User {
  username: string;
  isAdmin: boolean;
}

export interface ImagesApiResponse {
  items: ImageItem[];
  nextCursor: string | null;
  total?: number;
  currentPage?: number;
  totalPages?: number;
}
