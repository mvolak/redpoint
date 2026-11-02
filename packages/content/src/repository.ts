import { courses } from "./fixtures/courses";
import {
  departments,
  downloads,
  metrics,
  practitioners,
  safetyTopics,
  testimonials,
} from "./fixtures/organisation";
import { productFamilies } from "./fixtures/products";
import { archivedSessions, illustrativeSessions } from "./fixtures/sessions";
import { deriveSessionState } from "./sessions";
import type {
  ApprovalState,
  Audience,
  CourseDefinition,
  CoursePathway,
  CourseSession,
  Department,
  DownloadDoc,
  Metric,
  Practitioner,
  ProductFamily,
  SafetyTopic,
  SessionState,
  Testimonial,
} from "./types";

export type PublishMode = "preview" | "production";

export interface RepositoryOptions {
  mode: PublishMode;
  /** Show illustrative (invented) session data. Ignored in production. */
  includeIllustrative: boolean;
}

/** Production renders approved records only; preview also shows pending source data and proposals. */
export function isVisible(approval: ApprovalState, opts: RepositoryOptions): boolean {
  if (approval === "approved") return true;
  if (opts.mode === "production") return false;
  if (approval === "illustrative") return opts.includeIllustrative;
  return true;
}

export interface SessionQuery {
  now: Date;
  pathway?: CoursePathway;
  audience?: Audience;
  location?: string;
  courseSlug?: string;
}

export interface SessionView {
  session: CourseSession;
  course: CourseDefinition;
  state: SessionState;
  illustrative: boolean;
}

export interface SessionListing {
  /** Not yet ended — includes full/cancelled/unknown so the state is explicit. */
  upcoming: SessionView[];
  /** Ended sessions, newest first. Never presented as upcoming. */
  archive: SessionView[];
}

/**
 * Read interface shared by Redcord now and Redpoint later. The fixture implementation
 * will be replaced by a CMS / session-source adapter without changing page code.
 */
export interface ContentRepository {
  listProducts(filter?: { audience?: Audience }): ProductFamily[];
  getProduct(slug: string): ProductFamily | undefined;
  listCourses(filter?: { pathway?: CoursePathway; audience?: Audience }): CourseDefinition[];
  getCourse(slug: string): CourseDefinition | undefined;
  listSessions(query: SessionQuery): SessionListing;
  listSessionLocations(): string[];
  listDepartments(opts?: { enquiryOnly?: boolean }): Department[];
  getDownloads(ids: string[]): DownloadDoc[];
  listSafetyTopics(): SafetyTopic[];
  getSafetyTopic(slug: string): SafetyTopic | undefined;
  listMetrics(): Metric[];
  listTestimonials(): Testimonial[];
  listPractitioners(filter?: { city?: string }): Practitioner[];
}

export interface FixtureData {
  products: ProductFamily[];
  courses: CourseDefinition[];
  sessions: CourseSession[];
  departments: Department[];
  downloads: DownloadDoc[];
  safetyTopics: SafetyTopic[];
  metrics: Metric[];
  testimonials: Testimonial[];
  practitioners: Practitioner[];
}

export const defaultFixtures: FixtureData = {
  products: productFamilies,
  courses,
  sessions: [...archivedSessions, ...illustrativeSessions],
  departments,
  downloads,
  safetyTopics,
  metrics,
  testimonials,
  practitioners,
};

export function createFixtureRepository(
  opts: RepositoryOptions,
  data: FixtureData = defaultFixtures,
): ContentRepository {
  const vis = <T extends { source: { approval: ApprovalState } }>(items: T[]) =>
    items.filter((i) => isVisible(i.source.approval, opts));

  const courseBySlug = (slug: string) => vis(data.courses).find((c) => c.slug === slug);

  return {
    listProducts: (filter) =>
      vis(data.products).filter((p) => !filter?.audience || p.audiences.includes(filter.audience)),
    getProduct: (slug) => vis(data.products).find((p) => p.slug === slug),
    listCourses: (filter) =>
      vis(data.courses).filter(
        (c) =>
          (!filter?.pathway || c.pathway === filter.pathway) &&
          (!filter?.audience || c.audiences.includes(filter.audience)),
      ),
    getCourse: courseBySlug,
    listSessions: (q) => {
      const views: SessionView[] = [];
      for (const session of vis(data.sessions)) {
        const course = courseBySlug(session.courseSlug);
        if (!course) continue;
        if (q.pathway && course.pathway !== q.pathway) continue;
        if (q.audience && !course.audiences.includes(q.audience)) continue;
        if (q.location && session.location !== q.location) continue;
        if (q.courseSlug && session.courseSlug !== q.courseSlug) continue;
        views.push({
          session,
          course,
          state: deriveSessionState(session, q.now),
          illustrative: session.source.approval === "illustrative",
        });
      }
      const byStart = (a: SessionView, b: SessionView) =>
        new Date(a.session.start).getTime() - new Date(b.session.start).getTime();
      return {
        upcoming: views.filter((v) => v.state !== "past").sort(byStart),
        archive: views.filter((v) => v.state === "past").sort((a, b) => byStart(b, a)),
      };
    },
    listSessionLocations: () =>
      [...new Set(vis(data.sessions).map((s) => s.location))].sort((a, b) => a.localeCompare(b, "cs")),
    listDepartments: (o) => vis(data.departments).filter((d) => !o?.enquiryOnly || d.enquiryTarget),
    getDownloads: (ids) => vis(data.downloads).filter((d) => ids.includes(d.id)),
    listSafetyTopics: () => vis(data.safetyTopics),
    getSafetyTopic: (slug) => vis(data.safetyTopics).find((t) => t.slug === slug),
    // Metrics and testimonials are proof blocks: only approved records ever render, in any mode.
    listMetrics: () => data.metrics.filter((m) => m.source.approval === "approved"),
    listTestimonials: () => data.testimonials.filter((t) => t.source.approval === "approved"),
    listPractitioners: (filter) =>
      data.practitioners.filter(
        (p) =>
          p.source.approval === "approved" &&
          p.publicVisibility &&
          (!filter?.city || p.city === filter.city),
      ),
  };
}
