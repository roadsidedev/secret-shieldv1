import { BaseVaultAdapter, VaultWriteOptions } from './index.js';
import { 
  SecretsManagerClient, 
  CreateSecretCommand, 
  GetSecretValueCommand, 
  DeleteSecretCommand,
  ListSecretsCommand 
} from "@aws-sdk/client-secrets-manager";

export class AWSSecretsAdapter extends BaseVaultAdapter {
  private client: SecretsManagerClient;
  readonly region: string;

  constructor(config: { region: string; secretKey?: string }) {
    super(config.secretKey);
    this.region = config.region;
    this.client = new SecretsManagerClient({ region: config.region });
  }

  toWorkerConfig(): import('./index.js').VaultWorkerConfig {
    // Never serialize the HMAC master key into worker payloads
    return { type: 'aws', options: { region: this.region } };
  }

  async write(secret: string, options?: VaultWriteOptions): Promise<string> {
    const { randomBytes } = await import('crypto');
    const name = `keyspot/secret/${randomBytes(16).toString('hex')}`;
    const command = new CreateSecretCommand({
      Name: name,
      SecretString: secret,
      Tags: options?.tags ? Object.entries(options.tags).map(([Key, Value]) => ({ Key, Value })) : []
    });

    const response = await this.client.send(command);
    return response.Name!;
  }

  async read(id: string, _agentId?: string): Promise<string | null> {
    // In production, you'd check agentId against AWS IAM or Resource Policies
    const command = new GetSecretValueCommand({ SecretId: id });
    try {
      const response = await this.client.send(command);
      return response.SecretString || null;
    } catch (e) {
      return null;
    }
  }

  async list(): Promise<string[]> {
    const command = new ListSecretsCommand({
      Filters: [{ Key: "name", Values: ["keyspot/secret/"] }]
    });
    const response = await this.client.send(command);
    return response.SecretList?.map(s => s.Name!).filter(Boolean) || [];
  }

  async delete(id: string): Promise<boolean> {
    const command = new DeleteSecretCommand({ SecretId: id });
    try {
      await this.client.send(command);
      return true;
    } catch (e) {
      return false;
    }
  }
}
