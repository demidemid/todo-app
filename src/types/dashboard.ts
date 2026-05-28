export interface DashboardColumn {
  id: string;
  name: string;
  order: number;
}

export interface Dashboard {
  id: string;
  userId: string;
  name: string;
  columns: DashboardColumn[];
  createdAt: Date;
  updatedAt: Date;
}
