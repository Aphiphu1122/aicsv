export interface CsvRow {
    [key: string]: string | number | boolean | null;
}

export interface AnalysisState {
    isLoading: boolean;
    error: string | null;
    report: string | null;
}

export enum ProcessingStatus {
    IDLE = 'IDLE',
    PARSING = 'PARSING',
    ANALYZING = 'ANALYZING',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR'
}