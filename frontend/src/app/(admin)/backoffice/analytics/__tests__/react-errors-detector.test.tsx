/**
 * Tests de détection d'erreurs React
 * Détecte les erreurs courantes comme :
 * - Props manquantes
 * - Références non définies
 * - Erreurs de rendu
 * - Warnings React
 */

import React from "react";
import { render } from "@testing-library/react";

// Fonction utilitaire pour détecter les erreurs React
export const detectReactErrors = (component: React.ReactElement) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    const message = args.join(" ");
    if (
      message.includes("Warning:") ||
      message.includes("Error:") ||
      message.includes("is not defined") ||
      message.includes("ReferenceError") ||
      message.includes("TypeError")
    ) {
      errors.push(message);
    }
    // Ne pas répercuter vers console : ces cas sont volontaires et noieraient Jest.
  };

  console.warn = (...args: any[]) => {
    const message = args.join(" ");
    if (
      message.includes("Warning:") ||
      message.includes("Cannot update a component") ||
      message.includes("while rendering")
    ) {
      warnings.push(message);
    }
  };

  try {
    render(component);
  } catch (error: any) {
    errors.push(error.message || String(error));
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }

  return { errors, warnings };
};

describe("React Errors Detector", () => {
  it("devrait détecter les props manquantes", () => {
    const ComponentWithMissingProp = ({
      requiredProp,
    }: {
      requiredProp: string;
    }) => {
      // Utilisation de requiredProp sans vérification
      return <div>{requiredProp.toUpperCase()}</div>;
    };

    const { errors } = detectReactErrors(
      // @ts-expect-error - Test intentionnel
      <ComponentWithMissingProp />,
    );

    expect(errors.length).toBeGreaterThan(0);
  });

  it("devrait détecter les références non définies", () => {
    const ComponentWithUndefinedRef = () => {
      // Référence à une variable non définie
      // @ts-expect-error - Test intentionnel
      return <div>{undefinedVariable}</div>;
    };

    const { errors } = detectReactErrors(<ComponentWithUndefinedRef />);

    expect(errors.length).toBeGreaterThan(0);
  });

  it("ne devrait pas détecter d'erreurs pour un composant valide", () => {
    const ValidComponent = ({ prop = "default" }: { prop?: string }) => {
      return <div>{prop}</div>;
    };

    const { errors } = detectReactErrors(<ValidComponent />);

    expect(errors.length).toBe(0);
  });
});
