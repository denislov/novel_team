<purpose>
一致性验证别名：复用 review 工作流，但将目标明确收敛为校验章节逻辑、人设和时间线一致性。
</purpose>

<required_reading>
Read `workflows/review.md` before starting.
</required_reading>

<process>
Load and execute `workflows/review.md` end-to-end.

Additional constraints for this alias:
- 默认把输出 framing 为“验证报告”，而不是泛化审核。
- 若调用方传入 `--quick` 或 `--json`，保持与 `review` 相同的参数语义。
- 不额外引入新的 agent 或产物命名；沿用 `review` 的既有合同。
</process>
