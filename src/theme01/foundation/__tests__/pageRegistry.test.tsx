import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import { pageRegistry, resolvePage, usePage } from "../route/pageRegistry";
import { header_example } from "../../blueprint/examples";

function renderHook(callback: () => void) {
  // renderToString is enough to execute React hooks synchronously
  renderToString(React.createElement(() => {
    callback();
    return null;
  }));
}

describe("pageRegistry", () => {
  it("returns the about entry for /about", () => {
    const entry = resolvePage("/about");
    expect(entry?.slug).toBe("about");
    expect(entry?.title).toBe("About");
    expect(entry?.blueprint).toBe(header_example);
  });

  it("returns null when slug is unknown", () => {
    expect(resolvePage("/missing"))?.toBeNull();
    expect(resolvePage(undefined)).toBeNull();
  });

  it("usePage yields the registry entry", () => {
    let received: ReturnType<typeof usePage> | undefined;
    renderHook(() => {
      received = usePage("/about");
    });
    expect(received).toBe(pageRegistry.about);
  });

  it("usePage yields null for unknown slugs", () => {
    let received: ReturnType<typeof usePage> | undefined = undefined;
    renderHook(() => {
      received = usePage("/nowhere");
    });
    expect(received).toBeNull();
  });
});
