import assert from "node:assert/strict";
import test from "node:test";
import { chooseQuestionIndex } from "./surprise-quiz";

test("chooses a first question across the available question bank", () => {
  assert.equal(chooseQuestionIndex(3, null, () => 0), 0);
  assert.equal(chooseQuestionIndex(3, null, () => 0.99), 2);
});

test("does not repeat the preceding question when alternatives exist", () => {
  for (let previous = 0; previous < 3; previous++) {
    const choices = [0, 0.99].map((value) => chooseQuestionIndex(3, previous, () => value));
    assert.equal(new Set(choices).size, 2);
    assert.ok(choices.every((index) => index >= 0 && index < 3 && index !== previous));
  }
  assert.equal(chooseQuestionIndex(1, 0, () => 0), 0);
});
