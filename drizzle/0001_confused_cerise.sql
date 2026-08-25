CREATE TABLE `lineageEdges` (
	`id` varchar(96) NOT NULL,
	`sourceAssetId` varchar(96) NOT NULL,
	`targetAssetId` varchar(96) NOT NULL,
	`relation` varchar(64) NOT NULL,
	`metadata` json,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lineageEdges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipelineRuns` (
	`id` varchar(96) NOT NULL,
	`pipelineVersion` varchar(160) NOT NULL,
	`workflowName` varchar(255) NOT NULL,
	`status` enum('queued','running','succeeded','failed','stale') NOT NULL,
	`inputs` json,
	`outputs` json,
	`environment` json,
	`startedAt` timestamp NOT NULL,
	`finishedAt` timestamp,
	`replayOfRunId` varchar(96),
	CONSTRAINT `pipelineRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provenanceAssets` (
	`id` varchar(96) NOT NULL,
	`kind` enum('dataset','transformation','feature','model','run','result','job') NOT NULL,
	`name` varchar(255) NOT NULL,
	`version` varchar(160) NOT NULL,
	`status` enum('fresh','stale','changed','running','archived') NOT NULL DEFAULT 'fresh',
	`description` text,
	`owner` varchar(255),
	`checksum` varchar(128),
	`metadata` json,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provenanceAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `lineageEdges_source_idx` ON `lineageEdges` (`sourceAssetId`);--> statement-breakpoint
CREATE INDEX `lineageEdges_target_idx` ON `lineageEdges` (`targetAssetId`);--> statement-breakpoint
CREATE INDEX `pipelineRuns_pipelineVersion_idx` ON `pipelineRuns` (`pipelineVersion`);--> statement-breakpoint
CREATE INDEX `pipelineRuns_status_idx` ON `pipelineRuns` (`status`);--> statement-breakpoint
CREATE INDEX `provenanceAssets_kind_idx` ON `provenanceAssets` (`kind`);--> statement-breakpoint
CREATE INDEX `provenanceAssets_status_idx` ON `provenanceAssets` (`status`);