export declare const plannerPrompt: (userPrompt: string) => string;
export declare const contentPrompt: (plan: unknown, userPrompt: string) => string;
export declare const uiPrompt: (plan: unknown, content: unknown, userPrompt: string) => string;
export declare const codePrompt: (plan: unknown, design: unknown, content: unknown, userPrompt: string) => string;
export declare const qaPrompt: (site: unknown, userPrompt: string) => string;
export declare const revisionPrompt: (site: unknown, userPrompt: string) => string;
