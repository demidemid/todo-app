export interface DashboardColumn {
  id: string;
  name: string;
  order: number;
  isDone: boolean;
}

export interface Dashboard {
  id: string;
  userId: string;
  name: string;
  columns: DashboardColumn[];
  createdAt: Date;
  updatedAt: Date;
}
