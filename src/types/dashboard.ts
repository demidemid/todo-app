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
  order: number;
  columns: DashboardColumn[];
  sharedWith?: string[];
  sharedWithEmails?: string[];
  createdAt: Date;
  updatedAt: Date;
}
