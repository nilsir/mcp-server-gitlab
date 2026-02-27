/**
 * 配置读取与校验模块
 * 从环境变量读取必要配置，缺失时抛出错误
 */

export interface Config {
  gitlabToken: string;
  gitlabUrl: string;
}

export function loadConfig(): Config {
  const gitlabToken = process.env.GITLAB_TOKEN;
  if (!gitlabToken) {
    console.error("错误：GITLAB_TOKEN 环境变量未设置");
    process.exit(1);
  }

  const gitlabUrl = (process.env.GITLAB_URL ?? "https://gitlab.com").replace(
    /\/+$/,
    ""
  );

  return { gitlabToken, gitlabUrl };
}
