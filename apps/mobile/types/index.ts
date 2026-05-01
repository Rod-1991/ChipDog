export type Screen =
  | 'Login'
  | 'Register'
  | 'Home'
  | 'PetList'
  | 'NearbyMap'
  | 'LostPetList'
  | 'LostPetDetail'
  | 'AddPet'
  | 'PetDetail'
  | 'PetInfo'
  | 'PetContact'
  | 'PetVetHistory'
  | 'PetVaccines'
  | 'LinkTag'
  | 'FoundTag'
  | 'FoundResult'
  | 'LostPetMap'
  | 'ScanTag'
  | 'Profile'
  | 'InviteCoOwner'
  | 'PetMembers';

export type PetMemberInvitation = {
  id: number;
  pet_id: number;
  pet_name: string;
  pet_species: string;
  pet_photo_url: string | null;
  invited_by_name: string;
  invited_email: string;
  created_at: string;
};

export type PetMember = {
  id: number;
  pet_id: number;
  user_id: string | null;
  role: 'owner' | 'co_owner';
  status: 'pending' | 'accepted' | 'rejected';
  invited_email: string;
  invited_by: string;
};

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  rut: string;
  sex: string;
  birth_year: number;
  commune: string;
};

export type Pet = {
  id: number;
  owner_id?: string;
  name: string;
  species: string;
  breed: string | null;
  is_lost: boolean;
  is_featured?: boolean;
  photo_url?: string | null;

  color?: string | null;
  birth_year?: number | null;
  birth_date_text?: string | null;
  sex?: string | null;
  weight_kg?: number | null;

  contact_primary_name?: string | null;
  owner_phone?: string | null;
  contact_secondary_name?: string | null;
  contact_secondary_phone?: string | null;
  owner_whatsapp?: string | null;
  public_notes?: string | null;

  allergies?: string | null;
  medications?: string | null;
  conditions?: string | null;

  vet_name?: string | null;
  vet_phone?: string | null;

  description?: string | null;
  sterilized?: boolean | null;
  chip_number?: string | null;
  blood_type?: string | null;
  insurance_name?: string | null;
  insurance_policy?: string | null;

  lost_lat?: number | null;
  lost_lng?: number | null;
  lost_radius_meters?: number | null;
};

export type VetAttachment = {
  id: string;
  kind: 'photo' | 'pdf';
  name: string;
  path: string;
  uri?: string;
  mimeType?: string | null;
};

export type FoundPet = {
  public_name: string;
  species: string;
  breed: string | null;
  color: string | null;
  public_notes: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  photo_url: string | null;
  is_lost: boolean;
  owner_name: string | null;
};

export type Vaccine = {
  id: number;
  pet_id: number;
  vaccine_name: string;
  applied_date: string;
  expiry_date: string | null;
  next_dose_date: string | null;
  veterinarian: string | null;
  clinic: string | null;
  batch_number: string | null;
  notes: string | null;
  created_at: string;
};

export type LostPetPin = {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  photo_url: string | null;
  lost_lat: number;
  lost_lng: number;
  lost_radius_meters: number | null;
  lost_commune: string | null;
  public_notes: string | null;
  contact_primary_name: string | null;
  owner_phone: string | null;
  owner_whatsapp: string | null;
};

export type NearbyLostPet = LostPetPin & { distance_m: number };

export type VetRecord = {
  id: string;
  date: string;
  doctor: string;
  clinic: string;
  reason: string;
  symptoms: string[];
  diagnosis: string;
  treatment: string;
  description: string;
  attachments: VetAttachment[];
  referencePhotos: string[];
};

export type InfoRowProps = { label: string; value?: string | null };

export type CardProps = { title?: string; accent?: string; children: any };
