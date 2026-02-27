/**
 * GitLab REST API 响应类型定义
 */

export interface GitLabIssue {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: string[];
  milestone: GitLabMilestone | null;
  assignees: GitLabUser[];
  author: GitLabUser;
  web_url: string;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  source_branch: string;
  target_branch: string;
  author: GitLabUser;
  assignees: GitLabUser[];
  web_url: string;
  sha: string;
  merge_commit_sha: string | null;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committer_name: string;
  committer_email: string;
  committed_date: string;
  web_url: string;
}

export interface GitLabDiff {
  old_path: string;
  new_path: string;
  a_mode: string;
  b_mode: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

export interface GitLabPipeline {
  id: number;
  iid: number;
  project_id: number;
  sha: string;
  ref: string;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  web_url: string;
  name: string | null;
}

export interface GitLabJob {
  id: number;
  status: string;
  stage: string;
  name: string;
  ref: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  web_url: string;
  pipeline: {
    id: number;
    ref: string;
    sha: string;
    status: string;
  };
}

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string;
  web_url: string;
}

export interface GitLabMilestone {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  state: string;
  due_date: string | null;
  web_url: string;
}

export interface GitLabLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
  text_color: string;
}

export interface GitLabSearchResult {
  id: number | string;
  title?: string;
  name?: string;
  description?: string | null;
  web_url?: string;
  [key: string]: unknown;
}
