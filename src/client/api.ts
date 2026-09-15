import type { LoginRequest, LoginResponse } from "../shared/dtos";

const request = async <TResponse>(path: string, init?: RequestInit): Promise<TResponse> => {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json() as Promise<TResponse>;
};

export const login = (input: LoginRequest) =>
  request<LoginResponse>("/api/user/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
