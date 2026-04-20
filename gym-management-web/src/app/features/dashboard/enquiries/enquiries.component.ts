import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { EnquiryService } from '../../../core/services/enquiry.service';
import {
  AddEnquiryFollowupDto,
  CreateEnquiryDto,
  EnquiryDetails,
  EnquiryListItem,
  UpdateEnquiryStageDto
} from '../../../core/models/enquiry.models';
import { TopbarComponent } from '../../../shared/components/topbar/topbar.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-enquiries',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  templateUrl: './enquiries.component.html',
  styleUrl: './enquiries.component.css'
})
export class EnquiriesComponent implements OnInit {
  isLoading = true;
  isSaving = false;
  isUpdatingStage = false;
  isAddingFollowup = false;
  errorMessage = '';

  enquiries: EnquiryListItem[] = [];
  selectedEnquiry: EnquiryDetails | null = null;
  availableStageOptions: string[] = [];

  query = {
    pageNumber: 1,
    pageSize: 10,
    searchTerm: '',
    stage: ''
  };

  totalCount = 0;
  totalPages = 0;

  createDraft: CreateEnquiryDto = {
    fullName: '',
    phone: '+91',
    email: '',
    source: '',
    notes: '',
    nextFollowupAt: ''
  };

  stageDraft: UpdateEnquiryStageDto = {
    toStage: 'CONTACTED',
    reason: ''
  };

  followupDraft: AddEnquiryFollowupDto = {
    outcome: '',
    notes: '',
    nextFollowupAt: ''
  };

  readonly stageOptions = ['NEW', 'CONTACTED', 'INTERESTED', 'TRIAL', 'CONVERTED', 'LOST'];

  getAvailableStages(currentStage: string): string[] {
    switch (currentStage) {
      case 'NEW':
        return ['CONTACTED', 'INTERESTED', 'TRIAL', 'CONVERTED', 'LOST'];
      case 'CONTACTED':
        return ['INTERESTED', 'TRIAL', 'CONVERTED', 'LOST'];
      case 'INTERESTED':
        return ['TRIAL', 'CONVERTED', 'LOST'];
      case 'TRIAL':
        return ['CONVERTED', 'LOST'];
      case 'CONVERTED':
      case 'LOST':
        return []; // Terminal stages
      default:
        return this.stageOptions;
    }
  }

  setStageFilter(stage: string): void {
    this.query.stage = stage;
    this.query.pageNumber = 1;
    this.loadEnquiries();
  }

  getStageClass(stage: string): string {
    switch (stage) {
      case 'NEW': return 'stage-new';
      case 'CONTACTED': return 'stage-contacted';
      case 'INTERESTED': return 'stage-interested';
      case 'TRIAL': return 'stage-trial';
      case 'CONVERTED': return 'stage-converted';
      case 'LOST': return 'stage-lost';
      default: return '';
    }
  }

  constructor(
    private readonly enquiryService: EnquiryService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadEnquiries();
  }

  loadEnquiries(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.enquiryService.getEnquiries({
      pageNumber: this.query.pageNumber,
      pageSize: this.query.pageSize,
      searchTerm: this.query.searchTerm || undefined,
      stage: this.query.stage || undefined
    }).subscribe({
      next: (response) => {
        this.enquiries = response.items;
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to load enquiries.';
        this.isLoading = false;
      }
    });
  }

  nextPage(): void {
    if (this.query.pageNumber < this.totalPages) {
      this.query.pageNumber++;
      this.loadEnquiries();
    }
  }

  prevPage(): void {
    if (this.query.pageNumber > 1) {
      this.query.pageNumber--;
      this.loadEnquiries();
    }
  }

  onCreateEnquiry(): void {
    if (!this.createDraft.fullName?.trim() || !this.createDraft.phone?.trim()) {
      this.notificationService.warning('Name and phone are required.');
      return;
    }

    this.isSaving = true;
    const payload: CreateEnquiryDto = {
      ...this.createDraft,
      fullName: this.createDraft.fullName.trim(),
      phone: this.normalizeIndianPhoneInput(this.createDraft.phone),
      email: this.createDraft.email?.trim() || null,
      source: this.createDraft.source?.trim() || null,
      notes: this.createDraft.notes?.trim() || null,
      nextFollowupAt: this.createDraft.nextFollowupAt || null
    };

    this.enquiryService.createEnquiry(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (created) => {
          this.notificationService.success('Enquiry created.');
          this.createDraft = {
            fullName: '',
            phone: '+91',
            email: '',
            source: '',
            notes: '',
            nextFollowupAt: ''
          };
          this.loadEnquiries();
          this.selectEnquiry(created.id);
        },
        error: (err) => {
          this.notificationService.error(err?.error?.message || 'Unable to create enquiry.');
        }
      });
  }

  selectEnquiry(id: string): void {
    this.enquiryService.getEnquiry(id).subscribe({
      next: (details) => {
        this.selectedEnquiry = details;
        this.availableStageOptions = this.getAvailableStages(details.stage);
        
        this.stageDraft.toStage = this.availableStageOptions.length > 0 ? this.availableStageOptions[0] : '';
        this.stageDraft.reason = '';
        this.followupDraft = {
          outcome: '',
          notes: '',
          nextFollowupAt: details.nextFollowupAt ?? ''
        };
      },
      error: (err) => {
        this.notificationService.error(err?.error?.message || 'Unable to load enquiry details.');
      }
    });
  }

  clearSelection(): void {
    this.selectedEnquiry = null;
  }

  updateStage(): void {
    if (!this.selectedEnquiry) {
      return;
    }
    if (!this.stageDraft.toStage?.trim()) {
      this.notificationService.warning('Please select a stage.');
      return;
    }

    this.isUpdatingStage = true;
    this.enquiryService.updateStage(this.selectedEnquiry.id, {
      toStage: this.stageDraft.toStage.trim(),
      reason: this.stageDraft.reason?.trim() || null
    })
      .pipe(finalize(() => (this.isUpdatingStage = false)))
      .subscribe({
        next: (updated) => {
          this.selectedEnquiry = updated;
          this.loadEnquiries();
          this.notificationService.success('Stage updated.');
        },
        error: (err) => {
          this.notificationService.error(err?.error?.message || 'Unable to update stage.');
        }
      });
  }

  addFollowup(): void {
    if (!this.selectedEnquiry) {
      return;
    }
    this.isAddingFollowup = true;
    this.enquiryService.addFollowup(this.selectedEnquiry.id, {
      outcome: this.followupDraft.outcome?.trim() || null,
      notes: this.followupDraft.notes?.trim() || null,
      nextFollowupAt: this.followupDraft.nextFollowupAt || null
    })
      .pipe(finalize(() => (this.isAddingFollowup = false)))
      .subscribe({
        next: (updated) => {
          this.selectedEnquiry = updated;
          this.loadEnquiries();
          this.notificationService.success('Follow-up added.');
        },
        error: (err) => {
          this.notificationService.error(err?.error?.message || 'Unable to add follow-up.');
        }
      });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.createDraft.phone = this.normalizeIndianPhoneInput(input.value);
    input.value = this.createDraft.phone;
  }

  trackByEnquiryId(_: number, enquiry: EnquiryListItem): string {
    return enquiry.id;
  }

  private normalizeIndianPhoneInput(value: string | null | undefined): string {
    const raw = (value ?? '').trim();
    if (!raw) {
      return '+91';
    }
    const digits = raw.replace(/\D/g, '');
    const tenDigits = digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(0, 10);
    return `+91${tenDigits}`;
  }
}
