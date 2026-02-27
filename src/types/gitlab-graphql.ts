/**
 * GitLab GraphQL API 响应类型定义
 */

export interface GraphQLNote {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    name: string;
  };
  system: boolean;
}

export interface GraphQLPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface GraphQLNotesConnection {
  nodes: GraphQLNote[];
  pageInfo: GraphQLPageInfo;
}

export interface GraphQLWorkItem {
  id: string;
  iid: string;
  title: string;
  notes: GraphQLNotesConnection;
}

export interface GetWorkItemNotesResponse {
  workItem: GraphQLWorkItem | null;
}

export interface CreateNoteResponse {
  createNote: {
    note: GraphQLNote | null;
    errors: string[];
  };
}

export interface CodeSnippetSearchItem {
  filename: string;
  projectPath: string;
  ref: string;
  startLine: number | null;
  data: string;
  blobPath?: string;
}

export interface CodeSnippetSearchResponse {
  codeSnippetSearch: {
    nodes: CodeSnippetSearchItem[];
    pageInfo: GraphQLPageInfo;
  };
}
