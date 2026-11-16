// API 오류. status 는 HTTP 상태, code 는 화면이 문구를 고르는 값, detail 은 어디가 틀렸는지(선택).
export class ApiError extends Error {
  constructor(status, code, detail) {
    super(code);
    this.status = status;
    this.code = code;
    if (detail) this.detail = detail;
  }
}
